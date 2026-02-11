import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

interface VideoAnswer {
  id: number;
  videoUrl: string;
  transcription: string | null;
  transcriptionStatus: string;
  questionId: number;
  questionText: string;
  orderNumber: number;
}

interface DetailedScores {
  passion: number;
  businessPlan: number;
  vision: number;
  problemSolving: number;
  strength: number;
}

interface Evaluation {
  id: number;
  totalScore: number | null;
  detailedScores: DetailedScores | null;
  aiComment: string | null;
  evaluationStatus: string;
}

interface Applicant {
  id: number;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

interface ApplicantDetail {
  applicant: Applicant;
  evaluation: Evaluation | null;
  videoAnswers: VideoAnswer[];
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '応募待ち' },
  { value: 'video_submitted', label: '動画提出済み' },
  { value: 'evaluated', label: '評価完了' },
  { value: 'accepted', label: '合格' },
  { value: 'rejected', label: '不合格' },
];

const SCORE_LABELS: Record<keyof DetailedScores, string> = {
  passion: '熱意・志望動機',
  businessPlan: '事業計画の具体性',
  vision: 'ビジョン・将来性',
  problemSolving: '課題認識・解決力',
  strength: '強み・差別化',
};

export default function AdminApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [data, setData] = useState<ApplicantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    const fetchData = async () => {
      try {
        const response = await api.get(`/admin/applicants/${id}`);
        setData(response.data);
        setSelectedStatus(response.data.applicant.status);
      } catch (err: any) {
        setError('データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, id]);

  const handleStatusUpdate = async () => {
    if (!id || selectedStatus === data?.applicant.status) return;

    setIsUpdating(true);
    try {
      await api.put(`/admin/applicants/${id}/status`, { status: selectedStatus });
      setData((prev) =>
        prev ? { ...prev, applicant: { ...prev.applicant, status: selectedStatus } } : null
      );
    } catch (err: any) {
      setError('ステータスの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">データが見つかりません</div>
      </div>
    );
  }

  const { applicant, evaluation, videoAnswers } = data;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/applicants"
              className="text-gray-600 hover:text-gray-900"
            >
              ← 一覧に戻る
            </Link>
            <h1 className="text-xl font-bold text-gray-900">応募者詳細</h1>
          </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Applicant info & Evaluation */}
          <div className="lg:col-span-1 space-y-6">
            {/* Applicant info */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">応募者情報</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">名前</dt>
                  <dd className="text-gray-900 font-medium">{applicant.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">メールアドレス</dt>
                  <dd className="text-gray-900">{applicant.email}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">応募日時</dt>
                  <dd className="text-gray-900">
                    {new Date(applicant.createdAt).toLocaleString('ja-JP')}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Status update */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">ステータス管理</h2>
              <div className="space-y-4">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input-field"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || selectedStatus === applicant.status}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {isUpdating ? '更新中...' : 'ステータスを更新'}
                </button>
              </div>
            </div>

            {/* AI Evaluation */}
            {evaluation && evaluation.evaluationStatus === 'completed' && (
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">AI評価結果</h2>

                <div className="text-center mb-6">
                  <span
                    className={`text-4xl font-bold ${
                      (evaluation.totalScore || 0) >= 80
                        ? 'text-green-600'
                        : (evaluation.totalScore || 0) >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {evaluation.totalScore}
                  </span>
                  <span className="text-gray-500 text-xl"> / 100点</span>
                </div>

                {evaluation.detailedScores && (
                  <div className="space-y-3 mb-6">
                    {(Object.keys(evaluation.detailedScores) as Array<keyof DetailedScores>).map(
                      (key) => (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{SCORE_LABELS[key]}</span>
                            <span className="font-medium">
                              {evaluation.detailedScores![key]}点
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                evaluation.detailedScores![key] >= 80
                                  ? 'bg-green-500'
                                  : evaluation.detailedScores![key] >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${evaluation.detailedScores![key]}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {evaluation.aiComment && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">AIコメント</h3>
                    <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded">
                      {evaluation.aiComment}
                    </p>
                  </div>
                )}
              </div>
            )}

            {evaluation?.evaluationStatus === 'processing' && (
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">AI評価結果</h2>
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto mb-3" />
                  <p className="text-gray-500">評価処理中...</p>
                </div>
              </div>
            )}
          </div>

          {/* Right column - Video answers */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">動画回答</h2>

            {videoAnswers.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                まだ動画が提出されていません
              </div>
            ) : (
              videoAnswers.map((answer) => (
                <div key={answer.id} className="card">
                  <h3 className="font-medium text-gray-900 mb-3">
                    質問{answer.orderNumber}: {answer.questionText}
                  </h3>

                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                    <video
                      src={answer.videoUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">文字起こし</h4>
                    {answer.transcriptionStatus === 'completed' && answer.transcription ? (
                      <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded whitespace-pre-wrap">
                        {answer.transcription}
                      </p>
                    ) : answer.transcriptionStatus === 'processing' ? (
                      <div className="text-gray-500 text-sm bg-gray-50 p-3 rounded flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2" />
                        文字起こし処理中...
                      </div>
                    ) : answer.transcriptionStatus === 'failed' ? (
                      <p className="text-red-500 text-sm bg-red-50 p-3 rounded">
                        文字起こしに失敗しました
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm bg-gray-50 p-3 rounded">
                        文字起こし待機中...
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
