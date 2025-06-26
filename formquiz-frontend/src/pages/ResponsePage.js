import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function ResponsePage() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForm() {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (error) {
        console.error("Error fetching form:", error);
      } else {
        setForm(data);
      }
      setLoading(false);
    }

    fetchForm();
  }, [formId]);

  if (loading) return <p>Loading...</p>;
  if (!form) return <p>Form not found</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Respond to: {form.formname}</h2>
      {/* Replace below with your form rendering logic */}
      <p>(Form questions will go here)</p>
    </div>
  );
}
