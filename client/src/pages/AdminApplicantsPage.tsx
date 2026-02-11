import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

interface Applicant {
  id: number;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  totalScore: number | null;
  evaluationStatus: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '応募待ち', color: 'bg-gray-100 text-gray-800' },
  video_submitted: { label: '動画提出済み', color: 'bg-blue-100 text-blue-800' },
  evaluated: { label: '評価完了', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: '合格', color: 'bg-green-100 text-green-800' },
  rejected: { label: '不合格', color: 'bg-red-100 text-red-800' },
};

export default function AdminApplicantsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'totalScore'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchApplicants = async () => {
      try {
        const response = await api.get('/admin/applicants');
        setApplicants(response.data);
      } catch (err: any) {
        setError('応募者一覧の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicants();
  }, [isAuthenticated]);

  const handleSort = (field: 'createdAt' | 'totalScore') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedApplicants = applicants
    .filter((a) => filterStatus === 'all' || a.status === filterStatus)
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'totalScore') {
        comparison = (a.totalScore || 0) - (b.totalScore || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">応募者管理</h1>
          <button onClick={logout} className="text-gray-600 hover:text-gray-900">
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-sm text-gray-600 mr-2">ステータス:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="all">すべて</option>
              {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600">
            {filteredAndSortedApplicants.length} 件
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  応募者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalScore')}
                >
                  AIスコア
                  {sortField === 'totalScore' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  応募日時
                  {sortField === 'createdAt' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedApplicants.map((applicant) => (
                <tr key={applicant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {applicant.name}
                    </div>
                    <div className="text-sm text-gray-500">{applicant.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        STATUS_LABELS[applicant.status]?.color || 'bg-gray-100'
                      }`}
                    >
                      {STATUS_LABELS[applicant.status]?.label || applicant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {applicant.evaluationStatus === 'completed' && applicant.totalScore !== null ? (
                      <span
                        className={`text-lg font-bold ${
                          applicant.totalScore >= 80
                            ? 'text-green-600'
                            : applicant.totalScore >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {applicant.totalScore}点
                      </span>
                    ) : applicant.evaluationStatus === 'processing' ? (
                      <span className="text-gray-500 text-sm">評価中...</span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(applicant.createdAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/applicants/${applicant.id}`}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedApplicants.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              応募者がいません
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
