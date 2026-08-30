import { PlayCircle } from 'lucide-react'
import { usePMOCorexTour } from './PMOCorexTourProvider'
export default function ReplayTourButton(){const {startTour,active}=usePMOCorexTour();return <button type="button" onClick={startTour} disabled={active} className="ui-button ui-button--secondary w-full"><PlayCircle size={15}/>{active?'Guide in progress':'Replay getting started guide'}</button>}
