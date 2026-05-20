import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1>{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>This feature is under development</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will be available in a future update. Check back soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
