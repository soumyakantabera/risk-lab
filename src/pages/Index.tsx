import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to overview - this page is not used with the layout
const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/');
  }, [navigate]);
  
  return null;
};

export default Index;
