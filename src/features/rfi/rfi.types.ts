export interface RFI{
 id:string;
 projectId:number;
 title:string;
 description:string;
 status:'Draft'|'Submitted'|'Answered'|'Closed';
 assignedTo:string;
 dueDate:string;
}
