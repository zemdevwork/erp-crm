'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Phone, Mail,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  User,
  Calendar,
  GraduationCap,
  MapPin
} from 'lucide-react';
import { Enquiry } from '@/types/enquiry';
import { ENQUIRY_STATUS_OPTIONS } from '@/constants/enquiry';
import { IconBrandWhatsapp } from '@tabler/icons-react';

interface EnquiryMobileCardProps {
  enquiry: Enquiry;
  onView: (enquiryId: string) => void;
  onEdit: (enquiry: Enquiry) => void;
  onDelete: (enquiryId: string, candidateName: string) => void;
}

export function EnquiryMobileCard({ enquiry, onView, onEdit, onDelete }: EnquiryMobileCardProps) {
  const getStatusColor = (status: string) => {
    const statusOption = ENQUIRY_STATUS_OPTIONS.find((option) => option.value === status);
    return statusOption
      ? `bg-${statusOption.color}-100 text-${statusOption.color}-800`
      : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleEmail = (email?: string) => {
    if (email) {
      window.open(`mailto:${email}`, '_self');
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {enquiry.candidateName}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getStatusColor(enquiry.status)}>
                {ENQUIRY_STATUS_OPTIONS.find((opt) => opt.value === enquiry.status)?.label || enquiry.status}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onView(enquiry.id)} className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(enquiry)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(enquiry.id, enquiry.candidateName)}
                className="cursor-pointer text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="icon"
            variant="outline"
            className="flex-1"
            onClick={() => handleCall(enquiry.phone)}
          >
            <Phone className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="flex-1"
            onClick={() => handleWhatsApp(enquiry.phone)}
          >
            <IconBrandWhatsapp className="size-4" />
          </Button>
          {enquiry.email && (
            <Button
              size="icon"
              variant="outline"
              className="flex-1"
              onClick={() => handleEmail(enquiry.email)}
            >
              <Mail className="size-4" />
            </Button>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="font-mono">{enquiry.phone}</span>
          </div>
          {enquiry.contact2 && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="font-mono text-muted-foreground">{enquiry.contact2}</span>
            </div>
          )}
          {enquiry.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-muted-foreground">{enquiry.email}</span>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-sm">
          {enquiry.preferredCourse && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-gray-500" />
              <span>{enquiry.preferredCourse.name}</span>
            </div>
          )}
          {enquiry.enquirySource && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>{enquiry.enquirySource.name}</span>
            </div>
          )}
          {enquiry.assignedTo && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span>{enquiry.assignedTo.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{formatDate(enquiry.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}