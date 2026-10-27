import {
  Accessibility, Apple, BadgeCheck, Building2, CalendarClock, Camera, Car, ClipboardList, Construction,
  CreditCard, FileText, GraduationCap, HandHeart, Handshake, HeartPulse, House, Landmark, Map,
  MessageSquare, PawPrint, Receipt, Scale, Stethoscope, TrainFront,
} from 'lucide-react'

// Los nombres de icono vienen de data.json (campo "icono").
const ICONOS = {
  Accessibility, Apple, BadgeCheck, Building2, CalendarClock, Camera, Car, ClipboardList, Construction,
  CreditCard, FileText, GraduationCap, HandHeart, Handshake, HeartPulse, House, Landmark, Map,
  MessageSquare, PawPrint, Receipt, Scale, Stethoscope, TrainFront,
}

export default function Icon({ name, ...props }) {
  const Componente = ICONOS[name] ?? FileText
  return <Componente aria-hidden="true" {...props} />
}
