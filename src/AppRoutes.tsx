import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Collection from "./pages/Collection";
import EditProfile from "./pages/EditProfile";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import Feed from "./pages/Feed";
import AddItem from "./pages/AddItem";

export function AppRoutes() {
  return (
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
  );
}