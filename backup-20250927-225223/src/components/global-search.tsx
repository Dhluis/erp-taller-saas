"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  FileText, 
  Users, 
  Car, 
  Package, 
  Receipt,
  Clock,
  ArrowRight,
  Building2
} from "lucide-react"
import { searchGlobal, getQuickSuggestions, type SearchResult } from "@/lib/supabase/global-search"

export function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Cargar sugerencias al abrir el modal
  useEffect(() => {
    if (isOpen && !query) {
      loadSuggestions()
    }
  }, [isOpen, query])

  // Buscar cuando cambie el query
  useEffect(() => {
    if (query.length > 2) {
      searchResults(query)
    } else {
      setResults([])
    }
  }, [query])

  const loadSuggestions = async () => {
    try {
      const suggestions = await getQuickSuggestions()
      setSuggestions(suggestions)
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }

  const searchResults = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      const searchResults = await searchGlobal(searchQuery)
      setResults(searchResults)
    } catch (error) {
      console.error('Error searching:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'order': return 'Orden'
      case 'customer': return 'Cliente'
      case 'vehicle': return 'Vehículo'
      case 'product': return 'Producto'
      case 'quotation': return 'Cotización'
      case 'supplier': return 'Proveedor'
    }
  }

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'order': return 'bg-blue-100 text-blue-800'
      case 'customer': return 'bg-green-100 text-green-800'
      case 'vehicle': return 'bg-purple-100 text-purple-800'
      case 'product': return 'bg-orange-100 text-orange-800'
      case 'quotation': return 'bg-pink-100 text-pink-800'
      case 'supplier': return 'bg-indigo-100 text-indigo-800'
    }
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText': return FileText
      case 'Users': return Users
      case 'Car': return Car
      case 'Package': return Package
      case 'Receipt': return Receipt
      case 'Building2': return Building2
      default: return Search
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Search className="h-4 w-4" />
          <span className="sr-only">Buscar</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Global
          </DialogTitle>
          <DialogDescription>
            Busca órdenes, clientes, vehículos, productos y más
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Escribe para buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          {query.length > 0 ? (
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p>Buscando...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron resultados para "{query}"</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Resultados para "{query}" ({results.length})</span>
                  </div>
                  
                  <div className="space-y-2">
                    {results.map((result) => {
                      const IconComponent = getIcon(result.icon)
                      return (
                        <div
                          key={result.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            window.location.href = result.href
                            setIsOpen(false)
                          }}
                        >
                          <div className="flex-shrink-0">
                            <IconComponent className="h-5 w-5 text-muted-foreground" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">
                                {result.title}
                              </h4>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getTypeColor(result.type)}`}
                              >
                                {getTypeLabel(result.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Sugerencias rápidas</span>
              </div>
              
              {suggestions.length > 0 ? (
                <div className="space-y-2">
                  {suggestions.map((suggestion) => {
                    const IconComponent = getIcon(suggestion.icon)
                    return (
                      <div
                        key={suggestion.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          window.location.href = suggestion.href
                          setIsOpen(false)
                        }}
                      >
                        <div className="flex-shrink-0">
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">
                              {suggestion.title}
                            </h4>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getTypeColor(suggestion.type)}`}
                            >
                              {getTypeLabel(suggestion.type)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {suggestion.subtitle}
                          </p>
                        </div>
                        
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Escribe al menos 3 caracteres para buscar</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Presiona <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded text-xs">K</kbd> para buscar
          </div>
          <Button variant="ghost" size="sm">
            Búsqueda avanzada
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
