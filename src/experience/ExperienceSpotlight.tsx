
import { useEffect,useMemo,useState } from 'react'
export function ExperienceSpotlight({selector,children,onTargetClick}:{selector:string|null;children:React.ReactNode;onTargetClick?:()=>void}){
  const [rect,setRect]=useState<DOMRect|null>(null)
  useEffect(()=>{
    if(!selector){setRect(null);return}
    const update=()=>{const el=document.querySelector(selector);setRect(el?.getBoundingClientRect()||null)}
    update();window.addEventListener('resize',update);window.addEventListener('scroll',update,true)
    const el=document.querySelector(selector)
    const click=()=>onTargetClick?.()
    el?.addEventListener('click',click,true)
    return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);el?.removeEventListener('click',click,true)}
  },[selector,onTargetClick])
  const panels=useMemo(()=>rect?[
    {left:0,top:0,width:'100%',height:Math.max(0,rect.top-8)},
    {left:0,top:Math.max(0,rect.top-8),width:Math.max(0,rect.left-8),height:rect.height+16},
    {left:rect.right+8,top:Math.max(0,rect.top-8),width:Math.max(0,window.innerWidth-rect.right-8),height:rect.height+16},
    {left:0,top:rect.bottom+8,width:'100%',height:Math.max(0,window.innerHeight-rect.bottom-8)},
  ]:[],[rect])
  return <>{panels.map((p:any,i)=><div key={i} className="fixed z-[130] bg-[#102943]/65" style={p}/>)}
    {rect&&<div className="pointer-events-none fixed z-[131] rounded-xl border-4 border-[#ef8354] shadow-[0_0_0_6px_rgba(239,131,84,.25)]" style={{left:rect.left-6,top:rect.top-6,width:rect.width+12,height:rect.height+12}}/>}
    <div className="fixed z-[132]">{children}</div>
  </>
}
