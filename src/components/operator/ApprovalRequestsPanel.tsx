import type { PendingRequestInfo } from '../../shared/socketTypes';

interface ApprovalRequestsPanelProps {
  requests: PendingRequestInfo[];
  onApproveShow: (request: PendingRequestInfo) => void;
  onApprovePreview: (request: PendingRequestInfo) => void;
  onReject: (request: PendingRequestInfo) => void;
}

export function ApprovalRequestsPanel({ requests, onApproveShow, onApprovePreview, onReject }: ApprovalRequestsPanelProps) {
  if (requests.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300">
        Remote Request{requests.length > 1 ? 's' : ''} ({requests.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <li key={request.id} className="rounded border border-amber-500/30 bg-black/30 p-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">{request.bidderNumber}</span>
              <span className="text-neutral-200">{request.displayName || <em>no name</em>}</span>
            </div>
            <div className="text-xs text-neutral-500">from {request.remoteName}</div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onApproveShow(request)}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Approve and Show
              </button>
              <button
                type="button"
                onClick={() => onApprovePreview(request)}
                className="rounded border border-white/20 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-white/5"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => onReject(request)}
                className="rounded border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
