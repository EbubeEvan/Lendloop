import type { Doc, Id } from "../_generated/dataModel";
import { todayIso } from "./dates";

export type Party = {
  _id: Id<"users">;
  name: string;
  trustedLender: boolean;
  imageUrl?: string;
};

export type RequestCard = {
  _id: Id<"borrowRequests">;
  tool: {
    _id: Id<"tools">;
    name: string;
    category: Doc<"tools">["category"];
    condition: Doc<"tools">["condition"];
    description: string;
    isRemoved: boolean;
  };
  owner: Party;
  borrower: Party;
  startDate: string;
  endDate: string;
  note?: string;
  status: Doc<"borrowRequests">["status"];
  viewerRole: "borrower" | "lender" | "admin";
  isOverdue: boolean;
  canApprove: boolean;
  canDecline: boolean;
  canCancel: boolean;
  canReturn: boolean;
  reminderCount: number;
  lastRemindedOn?: string;
  createdAt: number;
  respondedAt?: number;
  returnedAt?: number;
};

function toParty(user: Doc<"users">): Party {
  return {
    _id: user._id,
    name: user.name,
    trustedLender: user.trustedLender,
    imageUrl: user.imageUrl,
  };
}

export function buildRequestCard(input: {
  request: Doc<"borrowRequests">;
  tool: Doc<"tools">;
  owner: Doc<"users">;
  borrower: Doc<"users">;
  viewerId: Id<"users">;
  viewerIsAdmin: boolean;
  today?: string;
}): RequestCard {
  const { request, tool, owner, borrower, viewerId, viewerIsAdmin } = input;
  const today = input.today ?? todayIso();

  const viewerRole: RequestCard["viewerRole"] =
    viewerId === owner._id ? "lender" : viewerId === borrower._id ? "borrower" : "admin";
  const isLender = viewerRole === "lender";
  const isBorrower = viewerRole === "borrower";
  const isPending = request.status === "pending";
  const isApproved = request.status === "approved";
  const involved = isLender || isBorrower;

  return {
    _id: request._id,
    tool: {
      _id: tool._id,
      name: tool.name,
      category: tool.category,
      condition: tool.condition,
      description: tool.description,
      isRemoved: tool.isRemoved,
    },
    owner: toParty(owner),
    borrower: toParty(borrower),
    startDate: request.startDate,
    endDate: request.endDate,
    note: request.note,
    status: request.status,
    viewerRole: involved ? viewerRole : viewerIsAdmin ? "admin" : "borrower",
    isOverdue: isApproved && request.endDate < today,
    canApprove: isLender && isPending && !tool.isRemoved,
    canDecline: isLender && isPending,
    canCancel: isBorrower && isPending,
    canReturn: isApproved && (involved || viewerIsAdmin),
    reminderCount: request.reminderCount,
    lastRemindedOn: request.lastRemindedOn,
    createdAt: request.createdAt,
    respondedAt: request.respondedAt,
    returnedAt: request.returnedAt,
  };
}
