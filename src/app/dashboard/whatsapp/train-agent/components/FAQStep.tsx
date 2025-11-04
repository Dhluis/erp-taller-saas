'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Trash2, Plus, Lightbulb } from 'lucide-react'

interface FAQ {
  question: string
  answer: string
}

interface FAQStepProps {
  data: FAQ[]
  onChange: (data: FAQ[]) => void
}

export function FAQStep({ data, onChange }: FAQStepProps) {
  const [faq, setFaq] = useState<FAQ[]>(data || [])

  useEffect(() => {
    if (data) {
      setFaq(data)
    }
  }, [data])

  const addFAQ = () => {
    const newFAQ: FAQ = { question: '', answer: '' }
    const updated = [...faq, newFAQ]
    setFaq(updated)
    onChange(updated)
  }

  const removeFAQ = (index: number) => {
    const newFAQ = faq.filter((_, i) => i !== index)
    setFaq(newFAQ)
    onChange(newFAQ)
  }

  const updateFAQ = (index: number, field: keyof FAQ, value: string) => {
    const newFAQ = [...faq]
    newFAQ[index][field] = value
    setFaq(newFAQ)
    onChange(newFAQ)
  }

  const addSuggestedQuestion = (question: string) => {
    const newFAQ: FAQ = { 
      question, 
      answer: '' 
    }
    const updated = [...faq, newFAQ]
    setFaq(updated)
    onChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>❓ Preguntas Frecuentes</CardTitle>
        <CardDescription>
          Agrega respuestas a preguntas comunes de tus clientes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* Sugerencias */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>💡 Preguntas comunes</AlertTitle>
          <AlertDescription>
            <p className="text-sm mb-2">Haz clic en una pregunta para agregarla:</p>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>
                <button
                  type="button"
                  onClick={() => addSuggestedQuestion('¿Hacen diagnósticos gratis?')}
                  className="text-primary hover:underline text-left"
                >
                  ¿Hacen diagnósticos gratis?
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => addSuggestedQuestion('¿Tienen servicio a domicilio?')}
                  className="text-primary hover:underline text-left"
                >
                  ¿Tienen servicio a domicilio?
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => addSuggestedQuestion('¿Aceptan seguros?')}
                  className="text-primary hover:underline text-left"
                >
                  ¿Aceptan seguros?
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => addSuggestedQuestion('¿Cuánto tarda una reparación típica?')}
                  className="text-primary hover:underline text-left"
                >
                  ¿Cuánto tarda una reparación típica?
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => addSuggestedQuestion('¿Dan factura?')}
                  className="text-primary hover:underline text-left"
                >
                  ¿Dan factura?
                </button>
              </li>
            </ul>
          </AlertDescription>
        </Alert>
        
        {/* Lista de FAQs */}
        {faq.map((item, index) => (
          <div key={index} className="border border-border rounded-lg p-4 space-y-4 bg-bg-secondary">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-text-primary">Pregunta #{index + 1}</h3>
              <Button 
                variant="ghost" 
                size="sm"
                type="button"
                onClick={() => removeFAQ(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div>
              <Label>Pregunta</Label>
              <Input 
                value={item.question}
                onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                placeholder="¿Hacen diagnósticos gratis?"
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Respuesta</Label>
              <Textarea 
                value={item.answer}
                onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                placeholder="Sí, el diagnóstico inicial es sin costo. Solo pagas si decides hacer la reparación."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
        ))}
        
        <Button 
          variant="outline" 
          onClick={addFAQ}
          className="w-full"
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar pregunta
        </Button>

        {faq.length === 0 && (
          <div className="text-center py-8 text-text-secondary">
            <p className="text-sm">No hay preguntas agregadas aún.</p>
            <p className="text-sm mt-1">Usa las sugerencias arriba o agrega tus propias preguntas.</p>
          </div>
        )}
        
      </CardContent>
    </Card>
  )
}
