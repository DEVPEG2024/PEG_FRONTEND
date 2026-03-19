import { useState } from 'react'
import { HiMapPin, HiXMark, HiCheck } from 'react-icons/hi2'

export interface DeliveryInfo {
    name: string
    email: string
    phone: string
    company: string
    address: string
    city: string
    zip: string
    notes: string
}

interface DeliveryFormProps {
    onSubmit: (info: DeliveryInfo) => void
    onCancel: () => void
    isLoading: boolean
}

function Field({ label, value, onChange, error, placeholder, type = 'text', textarea }: {
    label: string
    value: string
    onChange: (val: string) => void
    error?: string
    placeholder?: string
    type?: string
    textarea?: boolean
}) {
    const Tag = textarea ? 'textarea' : 'input'
    return (
        <div>
            <label className="text-[11px] text-gray-400 mb-1 block">{label}</label>
            <Tag
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={textarea ? 2 : undefined}
                className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none ${
                    error ? 'border-red-500/50' : 'border-gray-700'
                }`}
            />
            {error && <span className="text-[10px] text-red-400 mt-0.5 block">{error}</span>}
        </div>
    )
}

export default function DeliveryForm({ onSubmit, onCancel, isLoading }: DeliveryFormProps) {
    const [form, setForm] = useState<DeliveryInfo>({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        zip: '',
        notes: '',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const errs: Record<string, string> = {}
        if (!form.name.trim()) errs.name = 'Requis'
        if (!form.email.trim()) errs.email = 'Requis'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide'
        if (!form.address.trim()) errs.address = 'Requis'
        if (!form.city.trim()) errs.city = 'Requis'
        if (!form.zip.trim()) errs.zip = 'Requis'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit(form)
    }

    const set = (key: keyof DeliveryInfo, val: string) => {
        setForm(f => ({ ...f, [key]: val }))
        if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
    }

    return (
        <div className="border border-gray-700 rounded-xl p-4 bg-gray-800/50 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <HiMapPin className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-100">Informations de livraison</h3>
                </div>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 transition-colors">
                    <HiXMark className="w-4 h-4" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Nom complet *" value={form.name} onChange={v => set('name', v)} error={errors.name} placeholder="Jean Dupont" />
                    <Field label="Email *" value={form.email} onChange={v => set('email', v)} error={errors.email} placeholder="jean@entreprise.com" type="email" />
                    <Field label="Téléphone" value={form.phone} onChange={v => set('phone', v)} placeholder="06 12 34 56 78" />
                    <Field label="Entreprise" value={form.company} onChange={v => set('company', v)} placeholder="Nom de l'entreprise" />
                </div>

                <Field label="Adresse *" value={form.address} onChange={v => set('address', v)} error={errors.address} placeholder="12 rue de la Paix" />

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Code postal *" value={form.zip} onChange={v => set('zip', v)} error={errors.zip} placeholder="75002" />
                    <Field label="Ville *" value={form.city} onChange={v => set('city', v)} error={errors.city} placeholder="Paris" />
                </div>

                <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} placeholder="Instructions particulières..." textarea />

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                    <HiCheck className="w-4 h-4" />
                    {isLoading ? 'Envoi en cours...' : 'Confirmer la commande'}
                </button>
            </form>
        </div>
    )
}
