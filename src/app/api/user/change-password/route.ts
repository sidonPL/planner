import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Wszystkie pola są wymagane' },
        { status: 400 }
      );
    }

    // Pobierz użytkownika z hasłem
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { message: 'Użytkownik nie ma ustawionego hasła' },
        { status: 400 }
      );
    }

    // Sprawdź obecne hasło
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Obecne hasło jest nieprawidłowe' },
        { status: 400 }
      );
    }

    // Hash nowego hasła
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Zaktualizuj hasło
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: 'Hasło zostało zmienione' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { message: 'Nie udało się zmienić hasła' },
      { status: 500 }
    );
  }
}

