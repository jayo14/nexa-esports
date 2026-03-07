import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, X, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';

const bugReportSchema = z.object({
  category: z.enum(['gameplay', 'ui', 'performance', 'other']),
  description: z.string().min(10, 'Description must be at least 10 characters long.'),
  file: z.instanceof(File).optional(),
});

export const BugReportModal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof bugReportSchema>>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      category: 'gameplay',
      description: '',
    },
  });

  const handleScreenshot = async () => {
    setIsOpen(false);
    await new Promise(resolve => setTimeout(resolve, 500)); // wait for modal to close

    try {
      const canvas = await html2canvas(document.body);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'screenshot.png', { type: 'image/png' });
          form.setValue('file', file);
          setAttachedFile(file);
          toast({ title: 'Success', description: 'Screenshot captured and attached.' });
        }
        setIsOpen(true);
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to capture screenshot.', variant: 'destructive' });
      setIsOpen(true);
    }
  };

  const onSubmit = async (values: z.infer<typeof bugReportSchema>) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to report a bug.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let file_url = null;
      if (values.file) {
        const fileExt = values.file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('bug-reports').upload(fileName, values.file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('bug-reports').getPublicUrl(fileName);
        file_url = data.publicUrl;
      }

      const { error: insertError } = await supabase.from('bug_reports').insert({
        reporter_id: user?.id,
        category: values.category,
        description: values.description,
        file_url,
      });

      if (insertError) throw insertError;

      toast({ title: 'Success', description: 'Bug report submitted successfully.' });
      setIsOpen(false);
      form.reset();
      setAttachedFile(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to submit bug report.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isButtonVisible) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="fixed bottom-4 right-4 z-50">
          <Button className="rounded-full w-16 h-16 shadow-lg">
            <AlertCircle className="w-4 h-4 text-xl" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 rounded-full w-6 h-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsButtonVisible(false);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gameplay">Gameplay</SelectItem>
                      <SelectItem value="ui">UI</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the bug in detail..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Screenshot/Log (Optional)</FormLabel>
                  {attachedFile ? (
                    <div className="space-y-2">
                      <img src={URL.createObjectURL(attachedFile)} alt="Screenshot preview" className="rounded-lg max-h-48" />
                      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground truncate">{attachedFile.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAttachedFile(null);
                            form.setValue('file', undefined);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <FormControl>
                      <Input type="file" onChange={(e) => {
                        const file = e.target.files?.[0];
                        field.onChange(file);
                        setAttachedFile(file || null);
                      }} />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleScreenshot}>
                <Camera className="w-4 h-4 mr-2" />
                Take Screenshot
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
