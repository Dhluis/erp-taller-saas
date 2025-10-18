"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Wrench, Shield, UserCheck } from "lucide-react"

interface Employee {
  id: string
  name: string
  role: string
  specialties: string[]
}

interface ActiveEmployeesProps {
  employees: Employee[]
}

export function ActiveEmployees({ employees }: ActiveEmployeesProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'mechanic':
        return <Wrench className="h-4 w-4" />
      case 'supervisor':
        return <Shield className="h-4 w-4" />
      case 'admin':
        return <UserCheck className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'mechanic':
        return 'Mecánico'
      case 'supervisor':
        return 'Supervisor'
      case 'admin':
        return 'Administrador'
      case 'receptionist':
        return 'Recepcionista'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'mechanic':
        return 'bg-blue-100 text-blue-800'
      case 'supervisor':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'receptionist':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Empleados Activos
        </CardTitle>
        <CardDescription>
          Personal del taller actualmente activo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay empleados registrados</p>
          ) : (
            employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getRoleIcon(employee.role)}
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <Badge variant="secondary" className={getRoleColor(employee.role)}>
                      {getRoleLabel(employee.role)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  {employee.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {employee.specialties.slice(0, 2).map((specialty) => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {employee.specialties.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{employee.specialties.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

