export type WorkflowStatus='draft'|'submitted'|'in_review'|'approved'|'rejected'|'closed';
export interface WorkflowItem{
 id:string;
 projectId:number;
 title:string;
 type:'RFI'|'Submission'|'Approval'|'Inspection';
 status:WorkflowStatus;
}
