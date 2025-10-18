"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  notes: string
  created_at: string
}

export default function ClientesPage() {
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (data) setCustomers(data)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const customerData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      notes: formData.get("notes") as string,
      organization_id: "00000000-0000-0000-0000-000000000000"
    }

    try {
      const { error } = await supabase
        .from("customers")
        .insert([customerData])

      if (error) throw error
      
      alert("Cliente guardado exitosamente!")
      e.currentTarget.reset()
      fetchCustomers() // Recargar lista
    } catch (error) {
      console.error("Error:", error)
      alert("Error al guardar el cliente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Clientes</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Nuevo Cliente</CardTitle>
            <CardDescription>Registra un nuevo cliente en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre completo *</Label>
                <Input 
                  id="name"
                  name="name"
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  name="email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input 
                  id="phone"
                  name="phone"
                  placeholder="555-1234"
                />
              </div>

              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input 
                  id="address"
                  name="address"
                  placeholder="Calle Principal #123"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea 
                  id="notes"
                  name="notes"
                  placeholder="Notas adicionales sobre el cliente..."
                />
              </div>
              
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Cliente"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Recientes</CardTitle>
            <CardDescription>Lista de clientes registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone || "-"}</TableCell>
                    <TableCell>{customer.email || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {customers.length === 0 && (
              <p className="text-center text-gray-500 mt-4">No hay clientes registrados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}