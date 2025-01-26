import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Collection from "./pages/Collection";
import EditProfile from "./pages/EditProfile";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import Feed from "./pages/Feed";
import AddItem from "./pages/AddItem";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/add-item" element={<AddItem />} />
            </Routes>
          </Router>
          <Toaster />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;