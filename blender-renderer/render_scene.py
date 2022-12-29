import bpy
import os
import random
import time

from bpy_extras import object_utils
from mathutils import Vector

sample_count = 10000

start_time = time.time()


# render sample_count amount of either left or right door
def render_scene(scene_type):
    door_x_pos = 6.47896
    left_door = bpy.data.objects['Door_Group.001']
    left_handle = bpy.data.objects['Handle_Back']
    right_door = bpy.data.objects['Door_Group']
    right_handle = bpy.data.objects['Handle_Back.001']

    handle = None
    if scene_type == "left":
        base_door = left_door
        right_door.location.x = 99
        left_door.location.x = door_x_pos
        handle = left_handle
    else:
        base_door = right_door
        right_door.location.x = door_x_pos
        left_door.location.x = 99
        handle = right_handle

    door = None
    for child in base_door.children:
        if 'CTRL_Hole' in child.name:
            door = child

    if (door == None):
        print("did not find door")

    initial_handle_position = handle.location.copy()

    output_dir = "/Users/simon/Projects/vt2-image-demo-1/" + scene_type

    cameraPos = (6.67, -6.92, 2.78)

    w = door.dimensions.x
    door.dimensions.y
    h = door.dimensions.z
    w_t = door.matrix_world.translation

    door_color_catalogue = (
        (0.8, 1, 0.9, 1),
        (0.8, 0.8, 0.9, 1),
        (0.8, 0.9, 0.9, 1),
        (0.12, 0.06, 0.028, 1),
        (0.15, 0.08, 0.03, 1),
    )
    door_color_count = len(door_color_catalogue)

    door_material = bpy.data.materials["CustomDoorMaterial"]
    door_principled = door_material.node_tree.nodes["Principled BSDF"]

    handle_color_catalogue = (
        (0.2, 0.2, 0.2, 1),
        (0.1, 0.1, 0.1, 1),
        (0.15, 0.15, 0.15, 1),
        (0.4, 0.4, 0.4, 1),
        (0.7, 0.7, 0.7, 1),
        (0.75, 0.75, 0.75, 1),
        (0.8, 0.8, 0.8, 1),
        (0.85, 0.85, 0.85, 1),
        (0.9, 0.9, 0.9, 1),
    )
    handle_color_count = len(handle_color_catalogue)

    handle_material = bpy.data.materials["CustomHandleMaterial"]
    handle_principled = handle_material.node_tree.nodes["Principled BSDF"]

    noise_material = bpy.data.materials["CustomNoiseMaterial"]
    noise_principled = noise_material.node_tree.nodes["Principled BSDF"]

    light = bpy.context.scene.objects['Light']
    light_pos = (4.076245307922363, -3.5068583488464355, 5.903861999511719)

    lights = [
        bpy.context.scene.objects['Light'],
        bpy.context.scene.objects['Light.001'],
        bpy.context.scene.objects['Light.002'],
        bpy.context.scene.objects['Light.003'],
        bpy.context.scene.objects['Light.004'],
    ]

    noises = [
        bpy.context.scene.objects['Noise'],
    ]
    noise_pos = (6.479, -0.48, 1.28)

    for i in range(sample_count):
        for light in lights:
            light.data.energy = 1000 + ((random.random()*1000)-500)
            light.location = (random.randint(-12, 12),
                              light_pos[1], random.randint(1, 10))

        # noise variation
        for noise in noises:
            noise.location = ((random.random()*3) + 5.28,
                              noise_pos[1], random.random()*3.5)
            noise_seed_modifier = noise.modifiers[0].node_group.nodes[10].inputs[0]
            noise_seed_modifier.default_value = random.randint(0, 100000)

        # handle variation
        handle.scale.x = (random.random()*2.0)+0.5
        handle.scale.y = 1.0
        handle.scale.z = (random.random()*2.0)+0.5
        handle.location.x = initial_handle_position.x + \
            (random.random()*0.2)-0.1
        handle.location.z = initial_handle_position.z + \
            (random.random()*0.5)-0.25

        divergence = ((random.random()*3.0)-1.5, (random.random()
                      * 3.0)-1.5, (random.random()*3.0)-1.5)
        bpy.context.scene.objects['Camera'].location = (
            cameraPos[0]+divergence[0],
            cameraPos[1]+divergence[1],
            cameraPos[2]+divergence[2]
        )

        handle_principled.inputs["Base Color"].default_value = handle_color_catalogue[int(
            random.random()*handle_color_count)]
        door_principled.inputs["Base Color"].default_value = door_color_catalogue[int(
            random.random()*door_color_count)]

        noise_principled.inputs["Base Color"].default_value = (
            random.random(), random.random(), random.random(), 1)

        # render scene to jpg
        bpy.context.scene.render.filepath = os.path.join(
            output_dir, "scene" + str(i) + ".jpg")
        bpy.ops.render.render(write_still=True)

        # generate meta data
        bL = Vector((w_t[0]-(w/2), w_t[1], w_t[2]))
        ndcBottomLeft = object_utils.world_to_camera_view(
            bpy.context.scene,
            bpy.context.scene.objects['Camera'],
            bL
        )

        bR = Vector((w_t[0]+(w/2), w_t[1], w_t[2]))
        ndcBottomRight = object_utils.world_to_camera_view(
            bpy.context.scene,
            bpy.context.scene.objects['Camera'],
            bR
        )

        tR = Vector((w_t[0]+(w/2), w_t[1], w_t[2]+h))
        ndcTopRight = object_utils.world_to_camera_view(
            bpy.context.scene,
            bpy.context.scene.objects['Camera'],
            tR
        )

        tL = Vector((w_t[0]-(w/2), w_t[1], w_t[2]+h))
        ndcTopLeft = object_utils.world_to_camera_view(
            bpy.context.scene,
            bpy.context.scene.objects['Camera'],
            tL
        )

        file = open(output_dir+'/scene' + str(i) + '.txt', 'w')

        file.write("ndcBottomLeft " + str(ndcBottomLeft) + "\n")
        file.write("ndcBottomRight " + str(ndcBottomRight) + "\n")
        file.write("ndcTopRight " + str(ndcTopRight) + "\n")
        file.write("ndcTopLeft " + str(ndcTopLeft))

        file.close()

    handle.location = initial_handle_position


render_scene("left")
render_scene("right")

end_time = time.time()

print("finished in " + str(round(end_time - start_time, 2)) + "s")
