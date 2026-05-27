import { WalletActions } from "@/components/investing/wallet-actions";

export default function InvestingWalletPage() {
  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage wallet actions for your Entheios investing account.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Actions
        </div>
        <div className="mt-4">
          <WalletActions showWithdrawal />
        </div>
      </div>
    </section>
  );
}
