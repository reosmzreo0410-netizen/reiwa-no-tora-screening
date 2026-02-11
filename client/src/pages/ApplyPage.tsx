import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function ApplyPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/applicants', formData);
      const { id } = response.data;

      // Store applicant ID for next page
      sessionStorage.setItem('applicantId', id.toString());

      navigate('/apply/questions');
    } catch (err: any) {
      setError(err.response?.data?.error || '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SNS版「令和の虎」
          </h1>
          <p className="text-xl text-gold-600 font-semibold mb-4">
            動画選考システム
          </p>
          <p className="text-gray-600">
            あなたの事業プランをアピールしてください
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                お名前
              </label>
              <input
                type="text"
                id="name"
                required
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                required
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '送信中...' : '次へ進む'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          この後、5つの質問に動画で回答していただきます
        </p>
      </div>
    </div>
  );
}
