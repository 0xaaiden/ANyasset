import clsx from "clsx";
import type { InvoiceStatus } from "@/lib/types";

const steps: Array<{ status: InvoiceStatus; label: string; detail: string }> = [
  { status: "open", label: "Open", detail: "Invoice ready" },
  { status: "quoted", label: "Quoted", detail: "Flow route priced" },
  { status: "submitted", label: "Submitted", detail: "Wallet signed" },
  { status: "settled", label: "Settled", detail: "Merchant received" },
  { status: "failed", label: "Closed", detail: "Terminal state" }
];

const order: InvoiceStatus[] = [
  "draft",
  "open",
  "quoted",
  "submitted",
  "settled",
  "failed",
  "cancelled"
];

export function PaymentStatusTimeline({ status }: { status: InvoiceStatus }) {
  const currentIndex = order.indexOf(status);

  return (
    <div className="timeline" aria-label="Payment status timeline">
      {steps.map((step) => {
        const stepIndex = order.indexOf(step.status);
        const isDone =
          status === "settled"
            ? step.status !== "failed"
            : stepIndex < currentIndex && step.status !== "failed";
        const isActive =
          step.status === status ||
          (["failed", "cancelled"].includes(status) && step.status === "failed");

        return (
          <div
            key={step.status}
            className={clsx("timeline-step", isDone && "done", isActive && "active")}
          >
            <span className="timeline-dot" aria-hidden="true" />
            <strong>{step.label}</strong>
            <span className="muted">{step.detail}</span>
          </div>
        );
      })}
    </div>
  );
}
