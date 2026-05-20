"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SalesAdminView } from "../admin/sales-admin-view";

export function AdminBatchToolsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Admin batch tools</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Create Sales batches here instead of jumping over to the Admin tab.
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="inline-flex text-zinc-500 dark:text-zinc-400"
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 4l6 6-6 6" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-200 px-4 pb-4 pt-3 dark:border-zinc-800">
              <SalesAdminView />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
