import { useForm } from 'react-hook-form'
import { GoogleForm, UseGoogleFormReturn } from '../types'
import { submitToGoogleForms } from '../scripts/submitToGoogleForms'

const resolveField = (id: string, form: GoogleForm) => {
  const fieldIndex = form.fieldsOrder[id]

  if (fieldIndex === undefined) {
    throw new Error(`Field with id ${id} wasn't found in your form`)
  }

  return form.fields[fieldIndex]
}

export const useGoogleForm = ({ form }: { form: GoogleForm }) => {
  const methods = useForm() as UseGoogleFormReturn

  methods.getField = (id: string) => resolveField(id, form)

  methods.submitToGoogleForms = (formData, isDev) =>
    submitToGoogleForms(form, formData, isDev)

  return methods
}
