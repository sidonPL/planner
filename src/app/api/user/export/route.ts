import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type ExportRecipe = {
  id: string;
  name: string;
  category: string | null;
  difficulty: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: number;
};

type ExportTask = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  priority: string;
};

type ExportEvent = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  allDay: boolean;
};

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const format = searchParams.get('format') || 'json';

    const data: Record<string, unknown> = {};
    let recipesData: ExportRecipe[] | null = null;
    let tasksData: ExportTask[] | null = null;
    let eventsData: ExportEvent[] | null = null;

    // Recipes
    if (type === 'recipes' || type === 'all') {
      recipesData = await prisma.recipe.findMany({
        where: { createdById: session.user.id },
        select: {
          id: true,
          name: true,
          category: true,
          difficulty: true,
          prepTime: true,
          cookTime: true,
          servings: true,
        },
      });
      data.recipes = recipesData;
    }

    // Tasks
    if (type === 'tasks' || type === 'all') {
      tasksData = await prisma.task.findMany({
        where: {
          assigneeId: session.user.id,
        },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          priority: true,
        },
      });
      data.tasks = tasksData;
    }

    // Events
    if (type === 'events' || type === 'all') {
      eventsData = (await prisma.event.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          allDay: true,
        },
      })) as ExportEvent[];
      data.events = eventsData;
    }

    // Full export (GDPR)
    if (type === 'all') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          settings: true,
          badges: true,
          notifications: true,
        },
      });
      data.user = user;
    }

    // Convert to CSV if requested
    if (format === 'csv') {
      // Simplified CSV for single type exports
      let csv = '';

      if (type === 'recipes' && recipesData) {
        csv = 'ID,Name,Category,Difficulty,PrepTime,CookTime,Servings\n';
        recipesData.forEach((recipe) => {
          csv += `${recipe.id},"${recipe.name}","${recipe.category}","${recipe.difficulty}",${recipe.prepTime},${recipe.cookTime},${recipe.servings}\n`;
        });
      } else if (type === 'tasks' && tasksData) {
        csv = 'ID,Title,Status,DueDate,Priority\n';
        tasksData.forEach((task) => {
          csv += `${task.id},"${task.title}","${task.status}","${task.dueDate}","${task.priority}"\n`;
        });
      } else if (type === 'events' && eventsData) {
        csv = 'ID,Title,StartDate,EndDate,AllDay\n';
        eventsData.forEach((event) => {
          csv += `${event.id},"${event.title}","${event.startDate}","${event.endDate}",${event.allDay}\n`;
        });
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="planner-${type}-export.csv"`,
        },
      });
    }

    // JSON export
    const json = JSON.stringify(data, null, 2);
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="planner-${type}-export.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

