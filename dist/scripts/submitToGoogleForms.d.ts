import { GoogleForm } from '../types';
export declare const GOOGLE_FORMS_URL = "https://survey.pizzahut.vn/api/google-form-proxy";
export declare const formatQuestionName: (id: string) => string;
export declare const submitToGoogleForms: (form: GoogleForm, formData: object) => Promise<boolean>;
