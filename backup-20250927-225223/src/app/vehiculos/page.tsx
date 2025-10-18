"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"

interface Vehicle {
  id: string
  customer_id: string
  brand: string
  model: string
  year: number
  license_plate: string
  color: string
  customers?: { name: string }
}

export default function VehiculosPage() {
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchVehicles()
    fetchCustomers()
  }, [])

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from("vehicles")
      .select("*, customers(name)")
      .order("created_at", { ascending: false })
    
    if (data) setVehicles(data)
  }

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
    
    if (data) setCustomers(data)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const vehicleData = {
      customer_id: formData.get("customer_id") as string,
      brand: formData.get("brand") as string,
      model: formData.get("model") as string,
      year: parseInt(formData.get("year") as string),
      license_plate: formData.get("license_plate") as string,
      color: formData.get("color") as string,
    }

    try {
      const { error } = await supabase
        .from("vehicles")
        .insert([vehicleData])

      if (error) throw error
      
      alert("Vehículo guardado exitosamente!")
      e.currentTarget.reset()
      fetchVehicles()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al guardar el vehículo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Vehículos</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo Vehículo</CardTitle>
            <CardDescription>Registra un vehículo en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_id">Cliente *</Label>
                <Select name="customer_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Marca *</Label>
                  <Input name="brand" placeholder="Toyota" required />
                </div>
                <div>
                  <Label htmlFor="model">Modelo *</Label>
                  <Input name="model" placeholder="Corolla" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Año</Label>
                  <Input name="year" type="number" placeholder="2020" />
                </div>
                <div>
                  <Label htmlFor="license_plate">Placas</Label>
                  <Input name="license_plate" placeholder="ABC-123" />
                </div>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Input name="color" placeholder="Rojo" />
              </div>
              
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Vehículo"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehículos Registrados</CardTitle>
            <CardDescription>Lista de vehículos en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead>Placas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>{vehicle.customers?.name || "-"}</TableCell>
                    <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                    <TableCell>{vehicle.license_plate || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {vehicles.length === 0 && (
              <p className="text-center text-gray-500 mt-4">No hay vehículos registrados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}