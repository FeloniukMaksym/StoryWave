import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { SignInPage } from '@/features/auth/SignInPage';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { LibraryPage } from '@/features/library/LibraryPage';
import { DriveBrowserPage } from '@/features/drive-browser/DriveBrowserPage';
import { PlayerPage } from '@/features/player/PlayerPage';
import { PageTransition } from '@/components/PageTransition';

export function AppRouter() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/sign-in" element={<PageTransition><SignInPage /></PageTransition>} />
        <Route
          path="/library"
          element={
            <AuthGuard>
              <PageTransition><LibraryPage /></PageTransition>
            </AuthGuard>
          }
        />
        <Route
          path="/browse"
          element={
            <AuthGuard>
              <PageTransition><DriveBrowserPage /></PageTransition>
            </AuthGuard>
          }
        />
        <Route
          path="/player/:bookId"
          element={
            <AuthGuard>
              <PageTransition><PlayerPage /></PageTransition>
            </AuthGuard>
          }
        />
        <Route path="/" element={<Navigate to="/library" replace />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
