import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PlanningProvider } from "./contexts/PlanningContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Planning from "./pages/Planning";
import Employes from "./pages/Employes";
import Historique from "./pages/Historique";
import Parametres from "./pages/Parametres";
import Couverture from "./pages/Couverture";
import Seuils from "./pages/Seuils";
import VueSemaines from "./pages/VueSemaines";
import RotationMensuelle from "@/pages/RotationMensuelle";
import Gantt from "@/pages/Gantt";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/planning" component={Planning} />
        <Route path="/employes" component={Employes} />
        <Route path="/historique" component={Historique} />
        <Route path="/parametres" component={Parametres} />
        <Route path="/couverture" component={Couverture} />
        <Route path="/seuils" component={Seuils} />
        <Route path="/vue-semaines" component={VueSemaines} />
        <Route path="/rotation-mensuelle" component={RotationMensuelle} />
        <Route path="/gantt" component={Gantt} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <PlanningProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </PlanningProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
