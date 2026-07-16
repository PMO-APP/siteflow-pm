import { useLocation } from 'react-router-dom'

export function useStudioWorkspace(){
 const location=useLocation()
 return {
   currentPath:location.pathname,
   isStudio:location.pathname.startsWith('/app/studio')
 }
}
