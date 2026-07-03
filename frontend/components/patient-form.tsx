'use client';

import { AccordionCard, FormField, inputCls, selectCls } from './ui/form-utils';
import { PatientRecord } from '@/lib/types';

interface PatientFormProps {
  data: Partial<PatientRecord>;
  onChange: (patch: Partial<PatientRecord>) => void;
}

export function PatientForm({ data, onChange }: PatientFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  return (
    <div className="w-[240px] flex-shrink-0 border-r border-border bg-card/50 overflow-y-auto p-3 space-y-2.5">
      <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Patient Details</h2>

      <AccordionCard title="Basic Details" defaultOpen>
        <FormField label="Patient Name" full>
          <input name="patientName" value={data.patientName || ''} onChange={handleChange} className={inputCls} placeholder="Full name" />
        </FormField>
        <FormField label="Age">
          <input name="age" type="number" value={data.age || ''} onChange={handleChange} className={inputCls} placeholder="Age" />
        </FormField>
        <FormField label="Gender">
          <select name="gender" value={data.gender || ''} onChange={handleChange} className={selectCls}>
            <option value="">Select</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </FormField>
        <FormField label="Blood Group">
          <select name="bloodGroup" value={data.bloodGroup || ''} onChange={handleChange} className={selectCls}>
            <option value="">Select</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
          </select>
        </FormField>
        <FormField label="Group">
          <select name="group" value={data.group || ''} onChange={handleChange} className={selectCls}>
            <option value="">Select</option>
            <option>A</option><option>B</option><option>C</option><option>D</option>
          </select>
        </FormField>
        <FormField label="Birthdate">
          <input name="birthDate" type="date" value={data.birthDate || ''} onChange={handleChange} className={inputCls} />
        </FormField>
        <FormField label="Phone" full>
          <input name="phoneNumber" type="tel" value={data.phoneNumber || ''} onChange={handleChange} className={inputCls} placeholder="+91 00000 00000" />
        </FormField>
        <FormField label="Address" full>
          <textarea name="address" value={data.address || ''} onChange={handleChange} className={inputCls + ' resize-none'} rows={2} placeholder="Full address" />
        </FormField>
      </AccordionCard>

      <AccordionCard title="Additional Information">
        <FormField label="Smoking">
          <select name="smoking" value={data.smoking || ''} onChange={handleChange} className={selectCls}>
            <option value="">Select</option>
            <option>Never</option><option>Former</option><option>Current</option>
          </select>
        </FormField>
        <FormField label="Alcohol">
          <select name="alcoholConsumption" value={data.alcoholConsumption || ''} onChange={handleChange} className={selectCls}>
            <option value="">Select</option>
            <option>None</option><option>Occasional</option><option>Regular</option>
          </select>
        </FormField>
        <FormField label="Medical Condition" full>
          <select name="medicalCondition" value={data.medicalCondition || ''} onChange={handleChange} className={selectCls}>
            <option value="">Select</option>
            <option>Diabetes</option><option>Hypertension</option>
            <option>Cardiovascular Disease</option><option>Asthma</option>
          </select>
        </FormField>
        <FormField label="Chewing Habit" full>
          <select name="chewingHabit" value={data.chewingHabit || ''} onChange={handleChange} className={selectCls}>
            <option value="">Select</option>
            <option>None</option><option>Tobacco</option><option>Betel Nut</option><option>Other</option>
          </select>
        </FormField>
        <FormField label="Allergies" full>
          <input name="allergies" value={data.allergies || ''} onChange={handleChange} className={inputCls} placeholder="e.g. Penicillin, Latex" />
        </FormField>
        <FormField label="Notes" full>
          <textarea name="notes" value={data.notes || ''} onChange={handleChange} className={inputCls + ' resize-none'} rows={2} placeholder="Additional notes…" />
        </FormField>
      </AccordionCard>
    </div>
  );
}
