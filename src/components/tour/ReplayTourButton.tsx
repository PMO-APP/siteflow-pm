import { PlayCircle } from 'lucide-react'
import { usePMOCorexTour } from './PMOCorexTourProvider'
export default function ReplayTourButton(){const {startTour}=usePMOCorexTour();return <button onClick={startTour} className="btn btn-gold"><PlayCircle size={15}/>Replay interactive tour</button>}
