/**
 * Routes — Foundry applications used by this study.
 */

import React from 'react';
import { Navigate, createBrowserRouter, Outlet } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataExplorerPage as OntologyPage, WorkspaceSettingsPage, LoginPage } from '@/pages';
import PreOpenPage from '@/pages/Workshop/PreOpenPage';
import {
  CodeRepositoriesPage,
  WorkshopBuilderPage,
} from '@/pages/Foundry/FoundryApps';
import ObjectViewPage from '@/pages/Foundry/ObjectViewPage';
import OntologyManagerPage from '@/pages/Foundry/OntologyManagerPage';
import DatasetPreviewPage from '@/pages/Foundry/DatasetPreviewPage';
import DataConnectionPage from '@/pages/Foundry/DataConnectionPage';
import PipelineBuilderPage from '@/pages/Foundry/PipelineBuilderPage';
import DataLineagePage from '@/pages/Foundry/DataLineagePage';
import QuiverPage from '@/pages/Foundry/QuiverPage';
import VertexPage from '@/pages/Foundry/VertexPage';
import DataHealthPage from '@/pages/Foundry/DataHealthPage';
import CarbonPage from '@/pages/Foundry/CarbonPage';
import AutomatePage from '@/pages/Foundry/AutomatePage';
import NotepadPage from '@/pages/Foundry/NotepadPage';
import ApprovalsPage from '@/pages/Foundry/ApprovalsPage';
import ContourPage from '@/pages/Foundry/ContourPage';
import EvaluationPage from '@/pages/Foundry/EvaluationPage';
import CoursePage from '@/pages/Course/CoursePage';

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  title?: string;
}

export const flatRoutes: RouteConfig[] = [
  { path: '/', element: <Navigate to="/carbon" replace /> },
  { path: '/course', element: <CoursePage /> },
  { path: '/workshop/pre-open', element: <PreOpenPage /> },
  { path: '/workshop/builder', element: <WorkshopBuilderPage /> },
  { path: '/workshop', element: <Navigate to="/workshop/pre-open" replace /> },

  { path: '/ontology/manager', element: <OntologyManagerPage /> },
  { path: '/ontology/object-view', element: <ObjectViewPage /> },
  { path: '/ontology/quiver', element: <QuiverPage /> },
  { path: '/ontology/vertex', element: <VertexPage /> },
  { path: '/ontology/evaluation', element: <EvaluationPage /> },
  { path: '/ontology', element: <OntologyPage /> },

  { path: '/data', element: <Navigate to="/data/connection" replace /> },
  { path: '/data/connection', element: <DataConnectionPage /> },
  { path: '/data/dataset-preview', element: <DatasetPreviewPage /> },
  { path: '/data/contour', element: <ContourPage /> },
  { path: '/data/pipelines', element: <PipelineBuilderPage /> },
  { path: '/data/lineage', element: <DataLineagePage /> },
  { path: '/data/health', element: <DataHealthPage /> },

  { path: '/code', element: <Navigate to="/code/repositories" replace /> },
  { path: '/code/repositories', element: <CodeRepositoriesPage /> },

  { path: '/carbon', element: <CarbonPage /> },
  { path: '/automate', element: <AutomatePage /> },
  { path: '/notepad', element: <NotepadPage /> },
  { path: '/approvals', element: <ApprovalsPage /> },

  { path: '/settings', element: <WorkspaceSettingsPage /> },
  { path: '/settings/:section', element: <WorkspaceSettingsPage /> },
];

const LayoutWrapper: React.FC = () => {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <LayoutWrapper />,
    children: flatRoutes.map((route) => ({
      path: route.path,
      element: route.element,
    })),
  },
]);

export default flatRoutes;
