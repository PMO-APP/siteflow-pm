export interface Comment{
 id:string;
 entityType:'task'|'document'|'rfi'|'inspection'|'meeting';
 entityId:string;
 message:string;
 authorId:string;
 createdAt:string;
}
export interface Mention{
 userId:string;
 displayName:string;
}
