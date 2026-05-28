import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from './layout';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface Attribute {
  id: string;
  name: string;
  displayName: string;
  type: string;
  options: any;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export default function AttributesManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: attributes = [], isLoading, error } = useQuery<Attribute[]>({
    queryKey: ['/api/admin/attributes'],
  });

  const createAttributeMutation = useMutation({
    mutationFn: async (attributeData: any) => {
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attributeData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create attribute');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attributes'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Attribute created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create attribute",
        variant: "destructive",
      });
    },
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/attributes/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete attribute');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attributes'] });
      toast({
        title: "Success",
        description: "Attribute deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete attribute",
        variant: "destructive",
      });
    },
  });

  const handleCreateAttribute = (formData: FormData) => {
    const optionsText = formData.get('options') as string;
    let options = null;
    
    if (optionsText) {
      try {
        options = optionsText.split(',').map(opt => opt.trim());
      } catch (e) {
        options = optionsText;
      }
    }

    const attributeData = {
      name: formData.get('name') as string,
      displayName: formData.get('displayName') as string,
      type: formData.get('type') as string,
      options,
      isRequired: formData.get('isRequired') === 'true',
      isActive: true,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
    };
    
    createAttributeMutation.mutate(attributeData);
  };

  const filteredAttributes = attributes.filter((attribute: Attribute) =>
    attribute.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attribute.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load attributes</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/attributes'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-attributes">
            Product Attributes
          </h1>
          <p className="text-gray-600">Manage custom product attributes and options</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-attribute">
              <Plus className="h-4 w-4 mr-2" />
              Add Attribute
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Attribute</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateAttribute(new FormData(e.target as HTMLFormElement));
            }} className="space-y-4">
              <Input
                name="name"
                placeholder="Attribute Name (e.g., size)"
                required
                data-testid="input-name"
              />
              <Input
                name="displayName"
                placeholder="Display Name (e.g., Size)"
                required
                data-testid="input-display-name"
              />
              <Select name="type" required>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Attribute Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="select">Select List</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
              <Input
                name="options"
                placeholder="Options (comma-separated, for select types)"
                data-testid="input-options"
              />
              <Select name="isRequired" required>
                <SelectTrigger data-testid="select-required">
                  <SelectValue placeholder="Required?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Optional</SelectItem>
                  <SelectItem value="true">Required</SelectItem>
                </SelectContent>
              </Select>
              <Input
                name="sortOrder"
                type="number"
                placeholder="Sort Order"
                data-testid="input-sort-order"
              />
              <Button type="submit" className="w-full" data-testid="button-submit-attribute">
                Create Attribute
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Attributes</CardTitle>
          <CardDescription>Find attributes by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search attributes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-attributes"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Attributes ({filteredAttributes.length})</CardTitle>
          <CardDescription>All custom attributes for products</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Options</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttributes.map((attribute: Attribute) => (
                <TableRow key={attribute.id} data-testid={`row-attribute-${attribute.id}`}>
                  <TableCell>
                    <div className="font-medium font-mono" data-testid={`text-name-${attribute.id}`}>
                      {attribute.name}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-display-name-${attribute.id}`}>
                    {attribute.displayName}
                  </TableCell>
                  <TableCell data-testid={`text-type-${attribute.id}`}>
                    <Badge variant="secondary">{attribute.type}</Badge>
                  </TableCell>
                  <TableCell data-testid={`text-options-${attribute.id}`}>
                    {attribute.options && typeof attribute.options === 'object' 
                      ? Array.isArray(attribute.options) 
                        ? attribute.options.join(', ')
                        : JSON.stringify(attribute.options)
                      : attribute.options || '-'
                    }
                  </TableCell>
                  <TableCell data-testid={`text-required-${attribute.id}`}>
                    {attribute.isRequired ? (
                      <Badge variant="destructive">Required</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell data-testid={`status-${attribute.id}`}>
                    {attribute.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell data-testid={`text-order-${attribute.id}`}>
                    {attribute.sortOrder}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-edit-${attribute.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteAttributeMutation.mutate(attribute.id)}
                        data-testid={`button-delete-${attribute.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAttributes.length === 0 && (
            <div className="text-center py-8" data-testid="no-attributes-message">
              <p className="text-gray-500">
                {searchQuery ? 'No attributes found matching your search.' : 'No attributes found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}