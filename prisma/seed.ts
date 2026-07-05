// prisma/seed.ts
import { GroupCategory, ProfileType, Kinship, ClassroomType, ClassroomStatus } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service'; // 🎯 1. Importa tu propio servicio
import * as bcrypt from 'bcrypt';

// 🎯 2. Instanciamos TU servicio en lugar del PrismaClient genérico
// Al hacer esto, se ejecutará automáticamente el constructor que creaste con el adaptador de MariaDB
const prisma = new PrismaService();

async function main() {
    console.log('🌱 Empezando el proceso de seeding...');

    // 1. LIMPIEZA DE TABLAS (Opcional pero recomendado para evitar duplicados al re-ejecutar)
    // El orden importa debido a las restricciones de llaves foráneas en MySQL
    await prisma.weeklySchedule.deleteMany();
    await prisma.group.deleteMany();
    await prisma.classroom.deleteMany();
    await prisma.student.deleteMany();
    await prisma.user.deleteMany();

    console.log('🧹 Tablas limpiadas correctamente.');

    // ==========================================
    // 2. CREACIÓN DE USUARIOS (Administradores / Instructores)
    // ==========================================
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345678', salt);
    const admin = await prisma.user.create({
        data: {
            dni: 'V-12345678',
            name: 'Carlos Administrador',
            email: 'admin@academia.com',
            phone: '+584141112233',
            password: hashedPassword, // Recuerda hashear en producción
            isAdmin: true,
            profileOnboarding: true,
        },
    });

    const instructor1 = await prisma.user.create({
        data: {
            dni: 'V-87654321',
            name: 'María Instructora',
            email: 'maria.instructor@academia.com',
            phone: '+584249998877',
            password: hashedPassword,
            isAdmin: false,
            isAnInstructor: true,
            profileOnboarding: true,
        },
    });

    const representative = await prisma.user.create({
        data: {
            dni: 'V-11223344',
            name: 'Juan Representante',
            email: 'juan.rep@gmail.com',
            phone: '+584125554433',
            password: hashedPassword,
            isAdmin: false,
            profileOnboarding: true,
            profileType: ProfileType.representative,
            occupation: 'Ingeniero de Software',
        },
    });

    console.log('👥 Usuarios creados.');

    // ==========================================
    // 3. CREACIÓN DE ALUMNOS (Students)
    // ==========================================
    const student1 = await prisma.student.create({
        data: {
            firstName: 'Pedrito',
            lastName: 'Pérez',
            birthDate: new Date('2018-05-15'),
            kinship: Kinship.son,
            medicalObservations: 'Ninguna',
            address: 'Alta Vista, Puerto Ordaz, Bolívar',
            shirtSize: '10',
            hasExperience: false,
            userId: representative.id, // Enlazado a su representante
        },
    });

    console.log('👶 Estudiantes creados.');

    // ==========================================
    // 4. CREACIÓN DE SALONES (Classrooms)
    // ==========================================
    const classroomMirrors = await prisma.classroom.create({
        data: {
            name: 'Salón Principal Espejos',
            address: 'Piso 1, Ala Norte',
            maxCapacity: 25,
            type: ClassroomType.mirrors,
            status: ClassroomStatus.active,
            description: 'Salón amplio equipado con barras de ballet y espejos de cuerpo completo.',
        },
    });

    const classroomUrban = await prisma.classroom.create({
        data: {
            name: 'Módulo Urbano',
            address: 'Piso 2, Ala Sur',
            maxCapacity: 20,
            type: ClassroomType.urban,
            status: ClassroomStatus.active,
            description: 'Salón con aislamiento acústico ideal para ritmos urbanos y breaks.',
        },
    });

    console.log('🏢 Salones de clase creados.');

    // ==========================================
    // 5. CREACIÓN DE GRUPOS (Groups)
    // ==========================================
    const groupBabyDance = await prisma.group.create({
        data: {
            name: 'Baby Dance - Nivel 1',
            style: 'Iniciación al Ritmo',
            totalNumberOfSlots: 15,
            category: GroupCategory.baby,
            instructorId: instructor1.id, // Vinculado a María
            classroomId: classroomMirrors.id, // Vinculado al Salón de Espejos
        },
    });

    const groupUrbanYouth = await prisma.group.create({
        data: {
            name: 'Hip Hop Juvenil',
            style: 'Urban Dance',
            totalNumberOfSlots: 20,
            category: GroupCategory.youth,
            instructorId: instructor1.id,
            classroomId: classroomUrban.id,
        },
    });

    console.log('🕺 Grupos de danza creados.');

    // ==========================================
    // 6. CREACIÓN DE HORARIOS SEMANALES (WeeklySchedule)
    // ==========================================
    // Estructuramos el JSON tal cual lo solicita tu frontend y el default del modelo
    const scheduleDataBaby = {
        lunes: [{ id: 'b1', startTime: '15:00', endTime: '16:30', label: 'Técnica' }],
        martes: [],
        miércoles: [{ id: 'b2', startTime: '15:00', endTime: '16:30', label: 'Coreografía' }],
        jueves: [],
        viernes: [],
        sábado: [],
        domingo: [],
    };

    const scheduleDataUrban = {
        lunes: [],
        martes: [{ id: 'u1', startTime: '17:00', endTime: '18:30', label: 'Breaking Basics' }],
        miércoles: [],
        jueves: [{ id: 'u2', startTime: '17:00', endTime: '18:30', label: 'Crew Practice' }],
        viernes: [],
        sábado: [{ id: 'u3', startTime: '10:00', endTime: '12:00', label: 'Ensayo Intensivo' }],
        domingo: [],
    };

    await prisma.weeklySchedule.create({
        data: {
            schedule: scheduleDataBaby,
            groupId: groupBabyDance.id,
            classroomId: classroomMirrors.id,
        },
    });

    await prisma.weeklySchedule.create({
        data: {
            schedule: scheduleDataUrban,
            groupId: groupUrbanYouth.id,
            classroomId: classroomUrban.id,
        },
    });

    console.log('📅 Horarios semanales inyectados.');
    console.log('🏁 ¡Seeding completado con éxito!');
}

main()
    .catch((e) => {
        console.error('❌ Error ejecutando el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });