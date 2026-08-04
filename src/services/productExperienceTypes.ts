
export type FeedbackCategory='bug'|'feature_request'|'improvement'|'question'|'performance'|'ui_ux'|'permission'|'data'|'other'
export type FeedbackStatus='submitted'|'acknowledged'|'under_review'|'in_development'|'testing'|'resolved'|'released'|'closed'
export type FeedbackPriority='critical'|'high'|'medium'|'low'
export type FeedbackItem={
  id:string;reference:string;workspaceId:string;projectId:string|null;reporterId:string|null;
  title:string;description:string;category:FeedbackCategory;priority:FeedbackPriority;
  status:FeedbackStatus;module:string|null;pageUrl:string|null;metadata:Record<string,unknown>;
  voteCount:number;createdAt:string;updatedAt:string
}
export type HelpArticle={id:string;workspaceId:string|null;category:string;title:string;slug:string;summary:string;body:string;module:string|null;published:boolean;updatedAt:string}
export type ReleaseNote={id:string;workspaceId:string|null;version:string;title:string;summary:string;items:string[];releasedAt:string}
