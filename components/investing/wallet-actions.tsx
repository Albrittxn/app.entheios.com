"use client";

const addFundsMessage =
  "Investing oppurtunites are currenly limited to private invitation only. Please contact investing@entheios.com for more information";

const withdrawalMessage = "please wait until june 1st to withdrawal";

const actionButtonClass =
  "inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900";

const promoButtonClass =
  "group inline-flex min-h-16 items-center justify-between gap-4 rounded-xl border border-[rgba(212,175,55,0.35)] bg-[linear-gradient(135deg,rgba(212,175,55,0.14),rgba(255,255,255,0.98))] px-5 py-3 text-left text-zinc-900 shadow-[0_10px_30px_rgba(212,175,55,0.08)] transition hover:border-[rgba(212,175,55,0.5)] hover:shadow-[0_14px_36px_rgba(212,175,55,0.12)] dark:border-[rgba(212,175,55,0.3)] dark:bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(24,24,27,0.98))] dark:text-zinc-100";

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
        className={promoButtonClass}
        onClick={() => window.alert(addFundsMessage)}
      >
        <span className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(176,134,0)] dark:text-[rgb(229,196,98)]">
            Featured Offer
          </span>
          <span className="mt-1 text-sm font-semibold">
            Add $50 and receive $2500 invested alongside you
          </span>
        </span>
        <span className="text-base font-medium text-[rgb(176,134,0)] transition group-hover:translate-x-0.5 dark:text-[rgb(229,196,98)]">
          Learn more
        </span>
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
