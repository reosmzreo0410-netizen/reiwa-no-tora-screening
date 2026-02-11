import { Link } from 'react-router-dom';

export default function CompletePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="card">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ご応募ありがとうございます
          </h1>

          <p className="text-gray-600 mb-6">
            動画の選考を実施いたします。
            <br />
            結果は後日メールにてお知らせいたします。
          </p>

          <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mb-6">
            <p className="text-gold-800 text-sm">
              AI評価システムにより、あなたの回答を分析しています。
              <br />
              選考結果をお待ちください。
            </p>
          </div>

          <Link
            to="/apply"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
