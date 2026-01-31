import UserForm from "../components/UserForm";
import { useNavigate } from "react-router-dom";

const Home = ({ onJoin }) => {
  const navigate = useNavigate();

  const handleJoin = (name, role) => {
    onJoin(name, role);
    navigate("/call");
  };

  return <UserForm onJoin={handleJoin} />;
};

export default Home;
