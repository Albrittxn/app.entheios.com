"use client";

const addFundsMessage =
  "Investing oppurtunites are currenly limited to private invitation only. Please contact investing@entheios.com for more information";

const withdrawalMessage = "please wait until june 1st to withdrawal";

const actionButtonClass =
  "inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900";

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
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={actionButtonClass}
            onClick={() => window.alert(addFundsMessage)}
          >
            Add funds
          </button>
          <button
            type="button"
            className={actionButtonClass}
            onClick={() => window.alert(withdrawalMessage)}
          >
            Withdrawal
          </button>
        </div>
      </div>
    </section>
  );
}
