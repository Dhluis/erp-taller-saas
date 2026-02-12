'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

// Importar SwaggerUI dinámicamente para evitar problemas de SSR
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

// Importar CSS de SwaggerUI
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocs() {
  const [swaggerUrl, setSwaggerUrl] = useState<string>('')

  useEffect(() => {
    // Obtener la URL base del servidor
    const baseUrl = window.location.origin
    setSwaggerUrl(`${baseUrl}/api/swagger.json`)
  }, [])

  if (!swaggerUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando documentación de la API...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-600 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">Eagles System - Documentación de API</h1>
          <p className="mt-2 text-blue-100">
            Documentación completa de todos los endpoints del sistema ERP
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <SwaggerUI 
            url={swaggerUrl}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            tryItOutEnabled={true}
            requestInterceptor={(request) => {
              // Agregar headers de autenticación si están disponibles
              const token = localStorage.getItem('supabase.auth.token')
              if (token) {
                request.headers.Authorization = `Bearer ${token}`
              }
              return request
            }}
            responseInterceptor={(response) => {
              // Manejar respuestas de autenticación
              if (response.status === 401) {
                console.warn('Authentication required for this endpoint')
              }
              return response
            }}
            onComplete={() => {
              console.log('Swagger UI loaded successfully')
            }}
            onFailure={(error) => {
              console.error('Swagger UI failed to load:', error)
            }}
          />
        </div>
      </div>
      
      <footer className="bg-gray-100 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600">
          <p>
            Eagles System API v1.0.0 | 
            <a href="/api/swagger.json" className="text-blue-600 hover:text-blue-800 ml-2">
              Descargar especificación OpenAPI
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
