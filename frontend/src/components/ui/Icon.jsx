import {
  Accessibility, Apple, BadgeCheck, Building2, CalendarClock, Camera, Car, ClipboardList, Construction,
  CreditCard, FileText, GraduationCap, HandHeart, Handshake, HeartHandshake, HeartPulse, House, Landmark, Map,
  MessageSquare, PawPrint, Receipt, Scale, Stethoscope, Store, TrainFront, Users,
} from 'lucide-react'

// Los nombres de icono vienen de data.json y perfilamiento.json (campo "icono").
const ICONOS = {
  Accessibility, Apple, BadgeCheck, Building2, CalendarClock, Camera, Car, ClipboardList, Construction,
  CreditCard, FileText, GraduationCap, HandHeart, Handshake, HeartHandshake, HeartPulse, House, Landmark, Map,
  MessageSquare, PawPrint, Receipt, Scale, Stethoscope, Store, TrainFront, Users,
}

export default function Icon({ name, ...props }) {
  const Componente = ICONOS[name] ?? FileText
  return <Componente aria-hidden="true" {...props} />
}
