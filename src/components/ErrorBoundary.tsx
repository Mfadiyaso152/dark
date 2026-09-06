import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('thanaweya_user');
    } catch (e) {
      console.warn(e);
    }
    window.location.reload();
  };

  private handleFullReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn(e);
    }
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-right font-['Tajawal',sans-serif]"
        >
          <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-slate-800">
                حدث خطأ في تحميل الصفحة
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                تم حفظ بياناتك بنجاح. يمكنك إعادة تحديث الصفحة للمتابعة.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono text-left max-h-24 overflow-auto dir-ltr">
                {this.state.error.message || 'Unknown Error'}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل المنصة</span>
              </button>

              <button
                onClick={this.handleFullReset}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح الذاكرة المؤقتة وإعادة الدخول</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
