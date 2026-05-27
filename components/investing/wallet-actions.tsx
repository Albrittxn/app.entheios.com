"use client";

const addFundsMessage =
  "Investing oppurtunites are currenly limited to private invitation only. Please contact investing@entheios.com for more information";

const withdrawalMessage = "please wait until june 1st to withdrawal";

const actionButtonClass =
  "inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900";

type WalletActionsProps = {
  showWithdrawal?: boolean;
};

export function WalletActions({ showWithdrawal = false }: WalletActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
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
        onClick={() => window.alert(addFundsMessage)}
      >
        Add $50 and get $250 invested with you
      </button>
      {showWithdrawal && (
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => window.alert(withdrawalMessage)}
        >
          Withdrawal
        </button>
      )}
    </div>
  );
}
