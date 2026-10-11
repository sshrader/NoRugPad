import { Buffer } from 'buffer/'; // trailing slash = the npm package, not Node's built-in
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';
import {
  PROGRAM_ID as METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from '@metaplex-foundation/mpl-token-metadata';
import type { WalletContextState } from '@solana/wallet-adapter-react';

export const DECIMALS = 6;
export const TOTAL_SUPPLY = 1_000_000_000n; // whole tokens

export type CoinInput = { name: string; symbol: string; uri: string };
export type Stage = 'signing' | 'confirming';

/**
 * One transaction that does everything, in this order:
 *  1. create the mint account
 *  2. initialise it (decimals 6, the creator is temporarily mint + freeze authority)
 *  3. create the creator's token account
 *  4. mint the whole supply to it
 *  5. attach name / ticker / image link (Metaplex). This needs mint authority, so it must come
 *     BEFORE the revoke steps.
 *  6. revoke mint authority  (nobody can ever mint more)
 *  7. revoke freeze authority (nobody can freeze holders)
 *
 * It is all-or-nothing: if any step fails, nothing is created.
 *
 * NOTE: this is the "starter" model. The creator receives the entire supply. A real launchpad
 * has a bonding-curve program hold the supply and sell it along a curve. See README.
 */
export function buildCreateCoinTx(args: {
  payer: PublicKey;
  mint: PublicKey;
  rentLamports: number;
  input: CoinInput;
}): Transaction {
  const { payer, mint, rentLamports, input } = args;
  if (input.name.length > 32) throw new Error('Name can be at most 32 characters.');
  if (input.symbol.length > 10) throw new Error('Ticker can be at most 10 characters.');
  if (input.uri.length > 200) throw new Error('Metadata link can be at most 200 characters.');

  const ata = getAssociatedTokenAddressSync(mint, payer);
  const [metadata] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID,
  );

  return new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: rentLamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint, DECIMALS, payer, payer, TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountInstruction(payer, ata, payer, mint),
    createMintToInstruction(mint, ata, payer, TOTAL_SUPPLY * 10n ** BigInt(DECIMALS)),
    createCreateMetadataAccountV3Instruction(
      { metadata, mint, mintAuthority: payer, payer, updateAuthority: payer },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: input.name,
            symbol: input.symbol,
            uri: input.uri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: false, // name, ticker and image can never be swapped later
          collectionDetails: null,
        },
      },
    ),
    createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null),
    createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null),
  );
}

export async function createCoin(
  connection: Connection,
  wallet: WalletContextState,
  input: CoinInput,
  onStage?: (stage: Stage) => void,
): Promise<{ mint: string; signature: string }> {
  if (!wallet.publicKey || !wallet.sendTransaction) throw new Error('Connect a wallet first.');

  const mint = Keypair.generate();
  const rentLamports = await getMinimumBalanceForRentExemptMint(connection);
  const tx = buildCreateCoinTx({ payer: wallet.publicKey, mint: mint.publicKey, rentLamports, input });

  const latest = await connection.getLatestBlockhash('confirmed');
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = latest.blockhash;

  onStage?.('signing');
  // The new mint account must sign too, so its keypair goes in `signers`.
  const signature = await wallet.sendTransaction(tx, connection, { signers: [mint] });

  onStage?.('confirming');
  const result = await connection.confirmTransaction(
    { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    'confirmed',
  );
  if (result.value.err) throw new Error(`Transaction failed on chain: ${JSON.stringify(result.value.err)}`);

  return { mint: mint.publicKey.toBase58(), signature };
}
