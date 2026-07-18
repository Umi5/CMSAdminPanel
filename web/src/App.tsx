import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EventsProvider } from '@/shared/realtime/EventsProvider';
import { SchemaProvider } from '@/shared/schema/SchemaProvider';
import { AppLayout } from '@/shared/components/AppLayout';
import { NotFoundPage } from '@/shared/components/NotFoundPage';
import { SchemaListPage } from '@/features/schemas/components/SchemaListPage';
import { SchemaBuilderPage } from '@/features/schemas/components/SchemaBuilderPage';
import { EntryListPage } from '@/features/entries/components/EntryListPage';
import { EntryEditorPage } from '@/features/entries/components/EntryEditorPage';

export default function App() {
  return (
    <BrowserRouter>
      <EventsProvider>
        <SchemaProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/schemas" replace />} />
              <Route path="/schemas" element={<SchemaListPage />} />
              <Route path="/schemas/new" element={<SchemaBuilderPage />} />
              <Route path="/schemas/:schemaId" element={<EntryListPage />} />
              <Route path="/schemas/:schemaId/edit" element={<SchemaBuilderPage />} />
              <Route path="/schemas/:schemaId/entries/new" element={<EntryEditorPage />} />
              <Route path="/schemas/:schemaId/entries/:entryId" element={<EntryEditorPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppLayout>
        </SchemaProvider>
      </EventsProvider>
    </BrowserRouter>
  );
}
