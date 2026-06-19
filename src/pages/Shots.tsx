import { Layout } from '../components/Layout';
import { Video } from 'lucide-react';

export function Shots() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shots</h1>
          <p className="text-gray-600 mt-1">Short video content and quick updates</p>
        </div>

        <div className="lt-card p-12 text-center">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Shots Coming Soon</h3>
          <p className="text-gray-600">Share and discover quick video content</p>
        </div>
      </div>
    </Layout>
  );
}
