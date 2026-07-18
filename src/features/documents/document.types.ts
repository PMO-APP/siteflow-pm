export interface ProjectDocument{
 id:string;
 projectId:number;
 name:string;
 version:number;
 status:'Draft'|'Review'|'Approved'|'IFC'|'Superseded';
 discipline:'Architectural'|'Structural'|'MEP'|'Commercial'|'General';
}
